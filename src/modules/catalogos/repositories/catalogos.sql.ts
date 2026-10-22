import type { CiudadDto } from '../dto/ciudad.request.dto';
import type { DestinoDto } from '../dto/destino.request.dto';
import type { LocalDto } from '../dto/local.request.dto';
import type { TipoConductorDto } from '../dto/tipo-conductor.request.dto';
import type { TipoCoolerDto } from '../dto/tipo-cooler.request.dto';
import type { TipoEventoDto } from '../dto/tipo-evento.request.dto';
import type { Catalogo } from './catalogo.repository';

// La tabla, la consulta y las columnas de cada catálogo.

export const CIUDADES: Catalogo<CiudadDto> = {
  tabla: 'ciudad',
  select: `select c.id, c.nombre from ciudad c`,
  orden: 'lower(c.nombre)',
  columnas: { nombre: 'nombre' },
};

export const LOCALES: Catalogo<LocalDto> = {
  tabla: 'local',
  select: `select c.id, c.nombre, c.direccion, c.ciudad_id, ci.nombre as ciudad
           from local c
           join ciudad ci on ci.id = c.ciudad_id`,
  orden: 'lower(ci.nombre), lower(c.nombre)',
  columnas: { nombre: 'nombre', direccion: 'direccion', ciudadId: 'ciudad_id' },
};

export const DESTINOS: Catalogo<DestinoDto> = {
  tabla: 'destino_pedido_especial',
  select: `select c.id, c.nombre, c.precio_base from destino_pedido_especial c`,
  orden: 'lower(c.nombre)',
  columnas: { nombre: 'nombre', precioBase: 'precio_base' },
};

export const TIPOS_COOLER: Catalogo<TipoCoolerDto> = {
  tabla: 'tipo_cooler',
  select: `select c.id, c.marca, c.capacidad, c.color from tipo_cooler c`,
  orden: 'lower(c.marca), c.capacidad',
  columnas: { marca: 'marca', capacidad: 'capacidad', color: 'color' },
};

export const TIPOS_CONDUCTOR: Catalogo<TipoConductorDto> = {
  tabla: 'tipo_conductor',
  select: `select c.id, c.nombre from tipo_conductor c`,
  orden: 'lower(c.nombre)',
  columnas: { nombre: 'nombre' },
};

export const TIPOS_EVENTO: Catalogo<TipoEventoDto> = {
  tabla: 'tipo_evento',
  select: `select c.id, c.nombre, c.color from tipo_evento c`,
  orden: 'lower(c.nombre)',
  columnas: { nombre: 'nombre', color: 'color' },
};
